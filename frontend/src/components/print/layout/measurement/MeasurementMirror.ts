/**
 * MeasurementMirror.ts
 *
 * Dedicated Browser Measurement Surface for SPR Note DocLab Enterprise Layout.
 *
 * Recreates the exact document editing typography and container geometry:
 * - Content Width strictly equals PageGeometryCalculator.availableContentWidthPx
 * - Height Budget strictly equals PageGeometryCalculator.availableContentHeightPx
 * - Document & template styles
 * - Font family, font size, and line height
 * - Text direction (LTR / RTL)
 * - Complete table CSS (borders, padding, cell metrics)
 * - Image dimensions and aspect constraints
 * - List styling (margins, list-item indentations, marker layout)
 * - Paragraph margins and line wrapping
 * - Headings (h1 - h6) typography and orphan protection
 * - Application typography classes (.doclab-runtime-page-content, .docx-parsed-body, etc.)
 */

import { Rect } from '../types/layoutTypes';
import { SourceNodeType, LayoutDocumentOptions } from '../types/documentTypes';
import { PageGeometryCalculator, PageGeometry } from '../geometry/PageGeometry';
import { DocumentLayoutEngine } from '../DocumentLayoutEngine';
import { TextMeasurement } from './TextMeasurement';
import { TableMeasurement } from './TableMeasurement';
import {
  NodeMeasurementResult,
  MeasurementContext,
  BreakOpportunity,
} from './measurementTypes';

export const MEASUREMENT_MIRROR_ID = 'spr-doclab-measurement-mirror';
export const MEASUREMENT_STYLES_ID = 'spr-doclab-measurement-styles';

export class MeasurementMirror {
  private static mirrorContainer: HTMLDivElement | null = null;
  private static styleTag: HTMLStyleElement | null = null;
  private static measurementCache = new WeakMap<HTMLElement, NodeMeasurementResult>();

  /**
   * Resolves the authoritative layout geometry for measurement and pagination budgeting
   */
  public static getGeometry(options: LayoutDocumentOptions = {}): PageGeometry {
    return PageGeometryCalculator.calculate(options);
  }

  /**
   * Generates normalized baseline document and editor CSS matching the live editing surface
   */
  public static getBaseTypographyStyles(): string {
    return `
      #${MEASUREMENT_MIRROR_ID} {
        box-sizing: border-box !important;
        text-rendering: optimizeLegibility !important;
        -webkit-font-smoothing: antialiased !important;
        -moz-osx-font-smoothing: grayscale !important;
        font-feature-settings: "kern" 1, "liga" 1, "clig" 1 !important;
      }
      #${MEASUREMENT_MIRROR_ID} * {
        box-sizing: border-box !important;
      }
      #${MEASUREMENT_MIRROR_ID} p {
        margin-top: 0 !important;
        margin-bottom: 6px !important;
        line-height: inherit !important;
        word-break: normal !important;
        overflow-wrap: break-word !important;
      }
      #${MEASUREMENT_MIRROR_ID} h1 {
        font-size: 1.875rem !important;
        font-weight: 700 !important;
        line-height: 1.25 !important;
        margin-top: 16px !important;
        margin-bottom: 8px !important;
      }
      #${MEASUREMENT_MIRROR_ID} h2 {
        font-size: 1.5rem !important;
        font-weight: 700 !important;
        line-height: 1.3 !important;
        margin-top: 14px !important;
        margin-bottom: 6px !important;
      }
      #${MEASUREMENT_MIRROR_ID} h3 {
        font-size: 1.25rem !important;
        font-weight: 600 !important;
        line-height: 1.35 !important;
        margin-top: 12px !important;
        margin-bottom: 6px !important;
      }
      #${MEASUREMENT_MIRROR_ID} h4 {
        font-size: 1.125rem !important;
        font-weight: 600 !important;
        line-height: 1.4 !important;
        margin-top: 10px !important;
        margin-bottom: 4px !important;
      }
      #${MEASUREMENT_MIRROR_ID} h5 {
        font-size: 1rem !important;
        font-weight: 600 !important;
        line-height: 1.4 !important;
        margin-top: 8px !important;
        margin-bottom: 4px !important;
      }
      #${MEASUREMENT_MIRROR_ID} h6 {
        font-size: 0.875rem !important;
        font-weight: 600 !important;
        line-height: 1.4 !important;
        margin-top: 6px !important;
        margin-bottom: 4px !important;
      }
      #${MEASUREMENT_MIRROR_ID} table {
        width: 100% !important;
        border-collapse: collapse !important;
        margin-top: 8px !important;
        margin-bottom: 12px !important;
      }
      #${MEASUREMENT_MIRROR_ID} th,
      #${MEASUREMENT_MIRROR_ID} td {
        border: 1px solid #cbd5e1 !important;
        padding: 6px 10px !important;
        text-align: inherit !important;
        vertical-align: top !important;
      }
      #${MEASUREMENT_MIRROR_ID} th {
        background-color: #f8fafc !important;
        font-weight: 600 !important;
      }
      #${MEASUREMENT_MIRROR_ID} ul,
      #${MEASUREMENT_MIRROR_ID} ol {
        margin-top: 6px !important;
        margin-bottom: 6px !important;
        padding-inline-start: 24px !important;
      }
      #${MEASUREMENT_MIRROR_ID} li {
        margin-bottom: 4px !important;
        line-height: inherit !important;
      }
      #${MEASUREMENT_MIRROR_ID} img,
      #${MEASUREMENT_MIRROR_ID} svg,
      #${MEASUREMENT_MIRROR_ID} figure {
        max-width: 100% !important;
        height: auto !important;
        display: block !important;
        margin-top: 8px !important;
        margin-bottom: 8px !important;
      }
    `;
  }

  /**
   * Prepares or retrieves the authoritative offscreen measurement mirror element
   */
  public static getOrCreateMirror(context: MeasurementContext): HTMLDivElement {
    if (typeof document === 'undefined' || !document.body) {
      throw new Error('MeasurementMirror requires a valid browser DOM environment');
    }

    let mirror = document.getElementById(MEASUREMENT_MIRROR_ID) as HTMLDivElement | null;
    if (!mirror) {
      mirror = document.createElement('div');
      mirror.id = MEASUREMENT_MIRROR_ID;
      mirror.setAttribute('aria-hidden', 'true');
      mirror.setAttribute('data-doclab-measurement-mirror', 'true');
      mirror.style.position = 'fixed';
      mirror.style.top = '-99999px';
      mirror.style.left = '-99999px';
      mirror.style.visibility = 'hidden';
      mirror.style.pointerEvents = 'none';
      mirror.style.zIndex = '-9999';
      mirror.style.overflow = 'hidden';
      document.body.appendChild(mirror);
    }

    // Exact measurement width equal to availableContentWidthPx
    const containerWidth = Math.max(100, Math.round(context.containerWidth));
    mirror.style.width = `${containerWidth}px`;
    mirror.style.minWidth = `${containerWidth}px`;
    mirror.style.maxWidth = `${containerWidth}px`;
    mirror.style.boxSizing = 'border-box';
    mirror.style.fontFamily =
      context.fontFamily ||
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', 'Amiri', sans-serif";
    mirror.style.wordBreak = 'normal';
    mirror.style.overflowWrap = 'break-word';
    mirror.style.whiteSpace = 'normal';
    mirror.style.direction = (context.styles && context.styles.includes('rtl')) ? 'rtl' : 'ltr';

    if (context.fontSizePx) {
      mirror.style.fontSize = `${context.fontSizePx}px`;
    }
    if (context.lineHeight) {
      mirror.style.lineHeight = String(context.lineHeight);
    }

    // Inject base typography + custom template styles
    let styleTag = mirror.querySelector(`style#${MEASUREMENT_STYLES_ID}`) as HTMLStyleElement | null;
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = MEASUREMENT_STYLES_ID;
      mirror.appendChild(styleTag);
    }

    const customCss = context.styles ? context.styles.replace(/<\/?style\b[^>]*>/gi, '') : '';
    styleTag.textContent = `${this.getBaseTypographyStyles()}\n${customCss}`;

    this.mirrorContainer = mirror;
    this.styleTag = styleTag;
    return mirror;
  }

  /**
   * Measures a single element with caching and detailed line/table geometry
   */
  public static measureElement(
    el: HTMLElement,
    context: MeasurementContext
  ): NodeMeasurementResult {
    if (this.measurementCache.has(el)) {
      const cached = this.measurementCache.get(el)!;
      const currentRect = el.getBoundingClientRect();
      if (Math.abs(cached.width - currentRect.width) < 0.5 && Math.abs(cached.height - currentRect.height) < 0.5) {
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
    const width = elRect.width > 0 ? elRect.width : (el.offsetWidth || Math.max(100, context.containerWidth));
    let measuredHeight = elRect.height > 0 ? elRect.height : el.offsetHeight;

    if (!measuredHeight || measuredHeight === 0) {
      measuredHeight = this.estimateHeadlessDimensions(tag, el, context, width);
    }

    const height = measuredHeight;
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

    // 1. Table structure measurement
    if (tag === 'table') {
      tableGeometry = TableMeasurement.measureTable(el as HTMLTableElement, context);
      breakOpportunities = TableMeasurement.generateTableBreakOpportunities(tableGeometry);
    }
    // 2. Multi-line paragraph / heading measurement
    else if (!isAtomic && (type === 'paragraph' || type === 'heading')) {
      const textMetrics = TextMeasurement.measureTextLines(el, context);
      lines = textMetrics.lines;
      firstLineHeight = textMetrics.firstLineHeight;
      lastLineHeight = textMetrics.lastLineHeight;
      breakOpportunities = textMetrics.breakOpportunities;
    }

    const assignedNodeId =
      el.id ||
      (typeof el.getAttribute === 'function' && (el.getAttribute('data-node-id') || el.getAttribute('data-source-id'))) ||
      `${el.tagName ? el.tagName.toLowerCase() : 'node'}_0`;

    const result: NodeMeasurementResult = {
      nodeId: assignedNodeId,
      type,
      width,
      height,
      boundingRect,
      marginTop,
      marginBottom,
      paddingTop,
      paddingBottom,
      totalOuterHeight,
      flowOffsetTop: el.offsetTop,
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
   * Mounts and measures arbitrary raw HTML inside the authoritative Measurement Mirror
   */
  public static measureHtmlNodes(
    html: string,
    context: MeasurementContext
  ): NodeMeasurementResult[] {
    if (!html || !html.trim()) return [];

    if (typeof document === 'undefined' || !document.body || context.pureMode) {
      return this.measureHtmlNodesPure(html, context);
    }

    const mirror = this.getOrCreateMirror(context);

    // Host content container matching real editor CSS hierarchy
    const contentHost = document.createElement('div');
    contentHost.className =
      'doclab-runtime-page-content spr-measurement-content-host docx-parsed-body docx-preview-content docx-live-container font-sans text-xs sm:text-sm leading-relaxed';
    contentHost.style.width = '100%';
    contentHost.style.boxSizing = 'border-box';
    contentHost.innerHTML = html.trim();

    mirror.appendChild(contentHost);

    // Measure each top-level child element
    const childElements = Array.from(contentHost.children) as HTMLElement[];
    const results: NodeMeasurementResult[] = childElements.map((child, idx) => {
      const nextChild = childElements[idx + 1] as HTMLElement | undefined;
      const measurement = this.measureElement(child, context);
      const childRect = child.getBoundingClientRect();
      const flowOffsetTop = child.offsetTop;
      const childH = childRect.height > 0 ? childRect.height : measurement.height;
      const offsetDiff = nextChild ? nextChild.offsetTop - child.offsetTop : 0;
      const effectiveFlowHeight =
        offsetDiff > 0 ? offsetDiff : childH + measurement.marginBottom;

      return {
        ...measurement,
        flowOffsetTop,
        effectiveFlowHeight,
      };
    });

    // Clean up content host
    mirror.removeChild(contentHost);

    return results;
  }

  /**
   * Pure non-mutating mathematical measurement estimation for SSR / initial render phase
   */
  public static measureHtmlNodesPure(
    html: string,
    context: MeasurementContext
  ): NodeMeasurementResult[] {
    const blockRegex =
      /(<table[\s\S]*?<\/table>|<h[1-6][\s\S]*?<\/h[1-6]>|<p[\s\S]*?<\/p>|<div class="spr-page-break"[\s\S]*?<\/div>|<!--[\s\S]*?-->|<div[\s\S]*?<\/div>|<ul[\s\S]*?<\/ul>|<ol[\s\S]*?<\/ol>|<blockquote[\s\S]*?<\/blockquote>|<section[\s\S]*?<\/section>|<figure[\s\S]*?<\/figure>|<img[\s\S]*?>)/gi;
    const matches = html.match(blockRegex) || [html];

    return matches.map((block, idx) => {
      const isTable = /<table/i.test(block);
      const isHeading = /<h[1-6]/i.test(block);
      const isImg = /<img/i.test(block) || /<figure/i.test(block);
      const isManual = block.includes('data-manual-break="true"') || block.includes('spr-page-break');

      const width = context.containerWidth || 602;
      const inlineFontSizeMatch = block.match(/font-size:\s*(\d+)px/i);
      const fontSize = inlineFontSizeMatch ? parseInt(inlineFontSizeMatch[1], 10) : context.fontSizePx || 14;

      const inlineHeightMatch = block.match(/(?:min-)?height:\s*(\d+)px/i);
      const inlineMbMatch = block.match(/margin-bottom:\s*(\d+)px/i);
      const customHeight = inlineHeightMatch ? parseInt(inlineHeightMatch[1], 10) : undefined;
      const customMb = inlineMbMatch ? parseInt(inlineMbMatch[1], 10) : undefined;

      if (isManual) {
        return {
          nodeId: `pure_node_${idx}`,
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
        const trMatches = block.match(/<tr[\s\S]*?<\/tr>/gi) || [];
        let computedTableHeight = 0;
        if (trMatches.length > 0) {
          for (const tr of trMatches) {
            const trH = tr.match(/(?:min-)?height:\s*(\d+)px/i);
            computedTableHeight += trH ? parseInt(trH[1], 10) : 36;
          }
        } else {
          computedTableHeight = 140;
        }
        const height = customHeight !== undefined && !block.startsWith('<table') ? customHeight : computedTableHeight;
        const marginBottom = customMb !== undefined ? customMb : 8;
        return {
          nodeId: `pure_table_${idx}`,
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

      const isList = /<ul|<ol/i.test(block);
      if (isList) {
        const liMatches = block.match(/<li[\s\S]*?<\/li>/gi) || [];
        let listHeight = 12;
        const avgCharWidth = fontSize * 0.55;
        const charsPerLine = Math.max(20, Math.floor(width / avgCharWidth));
        const lineHeight = fontSize * (context.lineHeight ? Number(context.lineHeight) : 1.5);

        if (liMatches.length > 0) {
          for (const li of liMatches) {
            const liText = li.replace(/<[^>]+>/g, '').trim();
            const lines = Math.max(1, Math.ceil(liText.length / charsPerLine));
            listHeight += Math.max(lineHeight, lines * lineHeight) + 4;
          }
        } else {
          listHeight = 80;
        }

        const height = customHeight !== undefined ? customHeight : listHeight;
        const marginBottom = customMb !== undefined ? customMb : 8;

        return {
          nodeId: `pure_list_${idx}`,
          type: 'list' as SourceNodeType,
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
      }

      if (isHeading) {
        const height = customHeight !== undefined ? customHeight : 40;
        const marginBottom = customMb !== undefined ? customMb : 8;
        return {
          nodeId: `pure_heading_${idx}`,
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
          nodeId: `pure_img_${idx}`,
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

      // Paragraph
      const text = block.replace(/<[^>]+>/g, '').trim();
      const avgCharWidth = fontSize * 0.55;
      const charsPerLine = Math.max(20, Math.floor(width / avgCharWidth));
      const lineCount = Math.max(1, Math.ceil(text.length / charsPerLine));
      const lineHeight = fontSize * (context.lineHeight ? Number(context.lineHeight) : 1.5);
      const computedHeight = Math.max(lineHeight, lineCount * lineHeight);
      const height = customHeight !== undefined ? customHeight : computedHeight;
      const marginBottom = customMb !== undefined ? customMb : 6;

      return {
        nodeId: `pure_p_${idx}`,
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

  /**
   * Headless estimation for Node.js / unit tests
   */
  private static estimateHeadlessDimensions(
    tag: string,
    el: HTMLElement,
    context: MeasurementContext,
    width: number
  ): number {
    if (tag === 'table') {
      const tableGeom = TableMeasurement.measureTable(el as HTMLTableElement, context);
      return tableGeom.totalHeight;
    } else if (tag === 'ul' || tag === 'ol') {
      const lis = Array.from(el.querySelectorAll('li'));
      let lH = 12;
      lis.forEach((li) => {
        const textLen = (li.textContent || '').length;
        const lines = Math.max(1, Math.ceil(textLen / 45));
        lH += Math.max(28, lines * 24);
      });
      return Math.max(28, lH);
    } else if (tag === 'img' || tag === 'figure' || tag === 'svg') {
      return 220;
    } else {
      const text = (el.textContent || '').trim();
      const fSize = context.fontSizePx || 14;
      const avgCharWidth = fSize * 0.55;
      const charsPerLine = Math.max(20, Math.floor(width / avgCharWidth));
      const lineCount = Math.max(1, Math.ceil(text.length / charsPerLine));
      const lineHeight = fSize * (context.lineHeight ? Number(context.lineHeight) : 1.5);
      return Math.max(lineHeight, lineCount * lineHeight);
    }
  }
}
