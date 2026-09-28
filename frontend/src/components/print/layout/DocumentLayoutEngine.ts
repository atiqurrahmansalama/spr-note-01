/**
 * DocumentLayoutEngine
 * Core orchestrator for the DocLab geometry-driven document layout architecture.
 *
 * Implements mathematical page bounds calculation, node constraint evaluation,
 * and continuous-to-page fragmentation with 100% decoupling from persistent document data.
 *
 * CORE RULE: DOCUMENT CONTENT != PAGE LAYOUT.
 */

import {
  Dimensions,
  Insets,
  Rect,
  PageSizeId,
  PageOrientation,
  MarginPreset,
  PAPER_SIZE_METRICS_MM,
  MARGIN_PRESET_METRICS_MM,
  mmToPx,
} from './types/layoutTypes';

import {
  LayoutDocumentOptions,
  SourceDocument,
  SourceNode,
} from './types/documentTypes';

import {
  LayoutFragment,
  TableLayoutFragment,
  ParagraphLayoutFragment,
} from './types/fragmentTypes';

import {
  LayoutPage,
  LayoutDocument,
  PaginationEngineResult,
} from './types/paginationTypes';

import { PageGeometryCalculator } from './geometry/PageGeometry';
import { isExplicitManualBreak } from './logicalDocument';

export interface ComputedPageBounds {
  paperDimensions: Dimensions;
  margins: Insets;
  contentArea: Rect;
  headerArea: Rect;
  footerArea: Rect;
  signatureArea: Rect;
  maxContentHeight: number;
}

export class DocumentLayoutEngine {
  /**
   * Calculates exact physical and CSS pixel dimensions for a page
   */
  public static calculatePageDimensions(
    pageSize: PageSizeId = 'A4',
    orientation: PageOrientation = 'PORTRAIT'
  ): Dimensions {
    return PageGeometryCalculator.resolveDimensions(pageSize, orientation).px;
  }

  /**
   * Calculates margin insets in CSS pixels
   */
  public static calculateMargins(
    marginPreset: MarginPreset = 'NORMAL',
    customMarginsMm?: Partial<Insets>
  ): Insets {
    return PageGeometryCalculator.resolveMargins(marginPreset, customMarginsMm).px;
  }

  /**
   * Computes complete spatial layout bounds for a page sheet using PageGeometryCalculator
   */
  public static calculatePageBounds(options: LayoutDocumentOptions = {}): ComputedPageBounds {
    const geo = PageGeometryCalculator.calculate(options);

    return {
      paperDimensions: geo.paperDimensionsPx,
      margins: geo.marginsPx,
      contentArea: geo.contentAreaPx,
      headerArea: geo.headerAreaPx,
      footerArea: geo.footerAreaPx,
      signatureArea: geo.signatureAreaPx,
      maxContentHeight: geo.availableContentHeightPx,
    };
  }

  /**
   * Creates a blank, initialized LayoutPage instance
   */
  public static createLayoutPage(
    index: number,
    totalPages: number,
    options: LayoutDocumentOptions = {},
    customBounds?: ComputedPageBounds
  ): LayoutPage {
    const bounds = customBounds || this.calculatePageBounds(options);
    const isFirstPage = index === 0;
    const isLastPage = index === totalPages - 1;

    return {
      index,
      pageNumber: index + 1,
      width: bounds.paperDimensions.width,
      height: bounds.paperDimensions.height,
      margins: bounds.margins,
      contentArea: { ...bounds.contentArea },
      headerArea: { ...bounds.headerArea },
      footerArea: { ...bounds.footerArea },
      signatureArea: isLastPage || options.showSignaturesOnAllPages ? { ...bounds.signatureArea } : undefined,
      fragments: [],
      usedHeight: 0,
      availableHeight: bounds.contentArea.height,
      isFirstPage,
      isLastPage,
    };
  }

  /**
   * Creates an empty LayoutDocument container
   */
  public static createEmptyLayoutDocument(
    documentId: string = `doc_${Date.now()}`,
    options: LayoutDocumentOptions = {},
    title: string = 'Untitled Document'
  ): LayoutDocument {
    const bounds = this.calculatePageBounds(options);
    const firstPage = this.createLayoutPage(0, 1, options, bounds);

    return {
      documentId,
      title,
      width: bounds.paperDimensions.width,
      height: bounds.paperDimensions.height,
      pages: [firstPage],
      totalPages: 1,
      options,
      calculatedAt: Date.now(),
      calculationDurationMs: 0,
    };
  }

  /**
   * Helper factory to create a LayoutFragment
   */
  public static createFragment(params: Partial<LayoutFragment> & { id: string; sourceNodeId: string; pageIndex: number; rect: Rect }): LayoutFragment {
    return {
      type: params.type || 'paragraph',
      fragmentIndex: 0,
      totalFragments: 1,
      isFirstFragment: true,
      isLastFragment: true,
      isAutomaticBreak: false,
      isManualBreak: false,
      ...params,
    };
  }

  /**
   * Evaluates if a DOM element or SourceNode has keep-together constraints
   */
  public static isKeepTogether(node: HTMLElement | SourceNode): boolean {
    if ('classList' in node) {
      const el = node as HTMLElement;
      if (el.classList.contains('print-avoid-break') || el.classList.contains('keep-together')) {
        return true;
      }
      const style = el.getAttribute('style') || '';
      if (/page-break-inside\s*:\s*avoid/i.test(style) || /break-inside\s*:\s*avoid/i.test(style)) {
        return true;
      }
      const tag = el.tagName?.toLowerCase();
      if (tag === 'img' || tag === 'svg' || tag === 'figure' || el.classList.contains('print-signature-block')) {
        return true;
      }
      return false;
    }

    const srcNode = node as SourceNode;
    return Boolean(srcNode.constraints?.keepTogether || srcNode.constraints?.isAtomic || srcNode.type === 'image' || srcNode.type === 'signature');
  }

  /**
   * Evaluates if an element has keep-with-next constraints (e.g. headings)
   */
  public static isKeepWithNext(node: HTMLElement | SourceNode): boolean {
    if ('classList' in node) {
      const el = node as HTMLElement;
      if (el.classList.contains('keep-with-next')) return true;
      const tag = el.tagName?.toLowerCase();
      if (tag && /^h[1-6]$/.test(tag)) return true;
      const style = el.getAttribute('style') || '';
      return /break-after\s*:\s*avoid/i.test(style) || /page-break-after\s*:\s*avoid/i.test(style);
    }

    const srcNode = node as SourceNode;
    return Boolean(srcNode.constraints?.keepWithNext || srcNode.type === 'heading');
  }

  /**
   * Evaluates if an element represents an explicit manual page break
   */
  public static isManualBreak(node: HTMLElement | SourceNode): boolean {
    return isExplicitManualBreak(node as any);
  }
}
